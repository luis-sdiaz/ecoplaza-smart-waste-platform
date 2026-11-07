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
    prepareCoverImage: vi.fn().mockResolvedValue("data:image/webp;base64,mockCoverData"),
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

    expect(screen.getByRole("heading", { name: "User B" })).toBeTruthy();
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
    expect(screen.getByRole("heading", { name: "User B" })).toBeTruthy();

    await act(async () => {
      pendingName.resolve(true);
      await pendingName.promise;
    });

    expect(screen.queryByText("profile.nameUpdatedToastTitle")).toBeNull();
    expect(screen.getByRole("heading", { name: "User B" })).toBeTruthy();
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
    expect(screen.getByRole("heading", { name: "User B" })).toBeTruthy();
  });

  test("renders no private profile after the authenticated session disappears", () => {
    const view = render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: "User A" })).toBeTruthy();

    authState.current = createAuthState(null);
    view.rerender(<ProfilePage />);

    expect(view.container.childElementCount).toBe(0);
  });

  test("renders default institutional cover initially and switches to color palette", () => {
    window.localStorage.clear();
    const view = render(<ProfilePage />);

    // Default mode is the institutional cover
    const heroCover = view.container.querySelector(".profile-hero-cover");
    expect(heroCover?.classList.contains("profile-cover--default")).toBe(true);

    const defaultSwatch = screen.getByRole("radio", {
      name: "profile.coverDefault",
    });
    expect(defaultSwatch.getAttribute("aria-checked")).toBe("true");

    const ecoEmeraldSwatch = screen.getByRole("radio", {
      name: "profile.paletteEcoEmerald",
    });
    expect(ecoEmeraldSwatch.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(ecoEmeraldSwatch);

    expect(window.localStorage.getItem("ecoplaza_cover_palette")).toBe("eco-emerald");
    expect(window.localStorage.getItem("ecoplaza_cover_mode")).toBe("palette");
    expect(heroCover?.classList.contains("profile-cover--eco-emerald")).toBe(true);
    expect(ecoEmeraldSwatch.getAttribute("aria-checked")).toBe("true");
    expect(defaultSwatch.getAttribute("aria-checked")).toBe("false");
  });

  test("restores previously saved cover gradient palette from localStorage", () => {
    window.localStorage.setItem("ecoplaza_cover_palette", "cyber-ocean");
    window.localStorage.setItem("ecoplaza_cover_mode", "palette");
    const view = render(<ProfilePage />);

    const heroCover = view.container.querySelector(".profile-hero-cover");
    expect(heroCover?.classList.contains("profile-cover--cyber-ocean")).toBe(true);

    const cyberOceanSwatch = screen.getByRole("radio", {
      name: "profile.paletteCyberOcean",
    });
    expect(cyberOceanSwatch.getAttribute("aria-checked")).toBe("true");
  });

  test("restores previously saved custom cover image from localStorage", () => {
    window.localStorage.setItem("ecoplaza_cover_mode", "custom");
    window.localStorage.setItem(
      "ecoplaza_custom_cover",
      "data:image/webp;base64,mockCustomCoverImage",
    );
    const view = render(<ProfilePage />);

    const heroCover = view.container.querySelector(".profile-hero-cover");
    expect(heroCover?.classList.contains("profile-cover--custom")).toBe(true);

    const customSwatch = screen.getByRole("radio", {
      name: "profile.customCover",
    });
    expect(customSwatch.getAttribute("aria-checked")).toBe("true");
  });
});
