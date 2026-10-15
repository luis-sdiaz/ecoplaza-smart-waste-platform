import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

type AuthResult =
  | { ok: true }
  | { ok: false; error: { code: string; retryable: boolean } };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  current: {
    isLoading: false,
    isAuthenticated: false,
    user: null as null | { id: string; name: string; email: string; avatarUrl: null },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    ...authState.current,
    profileError: false,
    signIn: authMocks.signIn,
    signOut: authMocks.signOut,
  }),
}));

vi.mock("../src/components/auth/EcoContainer3D", () => ({ default: () => null }));
vi.mock("../src/components/auth/RegisterModal", () => ({ default: () => null }));
vi.mock("../src/components/auth/ForgotPasswordModal", () => ({ default: () => null }));

import ProtectedRoute from "../src/auth/ProtectedRoute";
import Sidebar from "../src/components/Sidebar";
import LoginPage from "../src/pages/LoginPage";

afterEach(cleanup);

beforeEach(() => {
  authMocks.signIn.mockReset();
  authMocks.signOut.mockReset();
  authState.current = {
    isLoading: false,
    isAuthenticated: false,
    user: null,
  };
});

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function fillValidCredentials() {
  fireEvent.change(screen.getByLabelText("login.email"), {
    target: { value: "manager@ecoplaza.test" },
  });
  fireEvent.change(screen.getByLabelText("login.password"), {
    target: { value: "correct-password" },
  });
}

describe("sign-in interactions", () => {
  test("validates required fields and malformed email before authentication", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "login.submit" }));
    expect(screen.getByText("login.emailRequired")).toBeTruthy();
    expect(screen.getByText("login.passwordRequired")).toBeTruthy();
    expect(authMocks.signIn).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("login.email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText("login.password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "login.submit" }));

    expect(screen.getByText("login.emailInvalid")).toBeTruthy();
    expect(authMocks.signIn).not.toHaveBeenCalled();
  });

  test("shows controlled authentication errors and restores the form state", async () => {
    authMocks.signIn.mockResolvedValueOnce({
      ok: false,
      error: { code: "invalid_credentials", retryable: false },
    });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillValidCredentials();

    fireEvent.click(screen.getByRole("button", { name: "login.submit" }));

    expect((await screen.findByRole("alert")).textContent).toContain("login.invalidCredentials");
    expect(screen.getByRole("button", { name: "login.submit" }).hasAttribute("disabled")).toBe(false);
  });

  test("prevents duplicate submissions and returns to the requested protected route", async () => {
    const pending = deferred<AuthResult>();
    authMocks.signIn.mockImplementationOnce(async () => {
      const result = await pending.promise;
      if (result.ok) {
        authState.current = {
          isLoading: false,
          isAuthenticated: true,
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Manager",
            email: "manager@ecoplaza.test",
            avatarUrl: null,
          },
        };
      }
      return result;
    });

    render(
      <MemoryRouter initialEntries={["/sales?buyer=acme#history"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/sales" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("login.title")).toBeTruthy();
    fillValidCredentials();
    fireEvent.click(screen.getByLabelText("login.rememberMe"));
    const form = screen.getByRole("button", { name: "login.submit" }).closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(authMocks.signIn).toHaveBeenCalledOnce();
    expect(authMocks.signIn).toHaveBeenCalledWith(
      "manager@ecoplaza.test",
      "correct-password",
      true,
    );
    expect(screen.getByRole("button", { name: "login.signingIn" }).getAttribute("aria-busy")).toBe("true");

    await act(async () => {
      pending.resolve({ ok: true });
      await pending.promise;
    });

    expect((await screen.findByLabelText("location")).textContent).toBe("/sales?buyer=acme#history");
  });

  test("disables sign-in controls while the session is being restored", () => {
    authState.current = { isLoading: true, isAuthenticated: false, user: null };
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    const submit = screen.getByRole("button", { name: "login.restoringSession" });
    expect(submit.hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("login.email").hasAttribute("disabled")).toBe(true);
    fireEvent.click(submit);
    expect(authMocks.signIn).not.toHaveBeenCalled();
  });
});

describe("sign-out interactions", () => {
  beforeEach(() => {
    authState.current = {
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Manager",
        email: "manager@ecoplaza.test",
        avatarUrl: null,
      },
    };
  });

  test("prevents duplicate sign-out requests and navigates to login on success", async () => {
    const pending = deferred<AuthResult>();
    authMocks.signOut.mockReturnValueOnce(pending.promise);
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <Routes>
          <Route path="/sales" element={<><Sidebar /><LocationProbe /></>} />
          <Route path="/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const signOut = screen.getByRole("button", { name: "navigation.signOut" });

    fireEvent.click(signOut);
    fireEvent.click(signOut);

    expect(authMocks.signOut).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "auth.signingOut" }).getAttribute("aria-busy")).toBe("true");

    await act(async () => {
      pending.resolve({ ok: true });
      await pending.promise;
    });

    expect((await screen.findByLabelText("location")).textContent).toBe("/login");
  });

  test("keeps the authenticated view and reports controlled sign-out failures", async () => {
    authMocks.signOut.mockResolvedValueOnce({
      ok: false,
      error: { code: "network_error", retryable: true },
    });
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <Sidebar />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "navigation.signOut" }));

    expect((await screen.findByRole("alert")).textContent).toContain("auth.signOutNetworkError");
    expect(screen.getByLabelText("location").textContent).toBe("/sales");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "navigation.signOut" }).hasAttribute("disabled")).toBe(false);
    });
  });
});
