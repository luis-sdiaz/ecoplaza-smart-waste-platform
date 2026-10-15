import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authState = vi.hoisted(() => ({ current: {} as TestAuthState }));
const imageMocks = vi.hoisted(() => ({ prepareProfileImage: vi.fn() }));

type TestUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type TestAuthState = {
  user: TestUser | null;
  profileError: boolean;
  updateUserName: ReturnType<typeof vi.fn>;
  updateUserAvatar: ReturnType<typeof vi.fn>;
  removeUserAvatar: ReturnType<typeof vi.fn>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const userA: TestUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "User A",
  email: "a@example.com",
  avatarUrl: "blob:user-a",
};
const userB: TestUser = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "User B",
  email: "b@example.com",
  avatarUrl: null,
};

function createAuthState(user: TestUser | null, profileError = false): TestAuthState {
  return {
    user,
    profileError,
    updateUserName: vi.fn().mockResolvedValue(true),
    updateUserAvatar: vi.fn().mockResolvedValue(true),
    removeUserAvatar: vi.fn().mockResolvedValue(true),
  };
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../src/auth/profileImage", () => {
  class MockProfileImageError extends Error {
    code: "too-large" | "unsupported" | "processing";

    constructor(code: "too-large" | "unsupported" | "processing") {
      super(code);
      this.code = code;
    }
  }

  return {
    prepareProfileImage: imageMocks.prepareProfileImage,
    ProfileImageError: MockProfileImageError,
  };
});

import ProfilePage from "../src/pages/ProfilePage";

afterEach(cleanup);

beforeEach(() => {
  authState.current = createAuthState(userA);
  imageMocks.prepareProfileImage.mockReset();
});

describe("Profile account isolation", () => {
  test("clears user A draft, validation, and profile error when switching to B", async () => {
    authState.current = createAuthState(userA, true);
    const view = render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "profile.editName" }));
    const nameInput = screen.getByRole("textbox", { name: "profile.name" });
    fireEvent.change(nameInput, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "profile.save" }));

    expect(screen.getByText("profile.nameValidation")).toBeTruthy();
    expect(screen.getByText("profile.loadErrorTitle")).toBeTruthy();

    authState.current = createAuthState(userB);
    view.rerender(<ProfilePage />);

    expect(screen.getByText("User B")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "profile.name" })).toBeNull();
    expect(screen.queryByText("profile.nameValidation")).toBeNull();
    expect(screen.queryByText("profile.loadErrorTitle")).toBeNull();
  });

  test("does not expose user A busy state or late name result in user B", async () => {
    const pendingName = deferred<boolean>();
    const authA = createAuthState(userA);
    authA.updateUserName.mockReturnValueOnce(pendingName.promise);
    authState.current = authA;
    const view = render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "profile.editName" }));
    fireEvent.change(screen.getByRole("textbox", { name: "profile.name" }), {
      target: { value: "Updated User A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "profile.save" }));
    await waitFor(() => expect(authA.updateUserName).toHaveBeenCalledOnce());

    authState.current = createAuthState(userB);
    view.rerender(<ProfilePage />);

    const editButton = screen.getByRole("button", { name: "profile.editName" });
    expect((editButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("User B")).toBeTruthy();

    await act(async () => {
      pendingName.resolve(true);
      await pendingName.promise;
    });

    expect(screen.queryByText("profile.nameUpdatedToastTitle")).toBeNull();
    expect(screen.getByText("User B")).toBeTruthy();
  });

  test("does not send a prepared user A avatar after switching to B", async () => {
    const pendingAvatar = deferred<Blob>();
    imageMocks.prepareProfileImage.mockReturnValueOnce(pendingAvatar.promise);
    const authA = createAuthState(userA);
    authState.current = authA;
    const view = render(<ProfilePage />);

    const fileInput = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [new File(["avatar"], "avatar.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(imageMocks.prepareProfileImage).toHaveBeenCalledOnce());

    const authB = createAuthState(userB);
    authState.current = authB;
    view.rerender(<ProfilePage />);

    await act(async () => {
      pendingAvatar.resolve(new Blob(["prepared"], { type: "image/webp" }));
      await pendingAvatar.promise;
    });

    expect(authA.updateUserAvatar).not.toHaveBeenCalled();
    expect(authB.updateUserAvatar).not.toHaveBeenCalled();
    expect(screen.getByText("User B")).toBeTruthy();
  });

  test("renders no private profile after the authenticated session disappears", () => {
    const view = render(<ProfilePage />);
    expect(screen.getByText("User A")).toBeTruthy();

    authState.current = createAuthState(null);
    view.rerender(<ProfilePage />);

    expect(view.container.childElementCount).toBe(0);
  });
});
