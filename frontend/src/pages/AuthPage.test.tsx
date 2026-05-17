import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthPage } from '@/pages/AuthPage';

const navigateMock = vi.fn();
const clearErrorMock = vi.fn();
const signInWithEmailMock = vi.fn();
const signUpWithEmailMock = vi.fn();
const signInWithGoogleMock = vi.fn();
const sendPasswordResetMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    signInWithEmail: (...args: unknown[]) => signInWithEmailMock(...args),
    signUpWithEmail: (...args: unknown[]) => signUpWithEmailMock(...args),
    signInWithGoogle: (...args: unknown[]) => signInWithGoogleMock(...args),
    sendPasswordReset: (...args: unknown[]) => sendPasswordResetMock(...args),
    clearError: clearErrorMock,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => {
      const values: Record<string, string> = {
        'auth.signIn': 'Sign In',
        'auth.signUp': 'Sign Up',
        'auth.signInTitle': 'Welcome back',
        'auth.signUpTitle': 'Create your Lingual account',
        'auth.subtitle': 'Practice speaking with real-time feedback.',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgotPassword': 'Forgot password?',
        'auth.resetTitle': 'Reset your password',
        'auth.resetSubtitle': 'Enter your account email and we will send a reset link.',
        'auth.resetSend': 'Send reset link',
        'auth.resetSent': 'If that email is registered, a password reset link has been sent.',
        'auth.resetBack': 'Back to sign in',
        'auth.or': 'or',
        'auth.continueWithGoogle': 'Continue with Google',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',
      };
      return values[key] ?? key;
    },
  }),
}));

describe('AuthPage password reset', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    clearErrorMock.mockReset();
    signInWithEmailMock.mockReset();
    signUpWithEmailMock.mockReset();
    signInWithGoogleMock.mockReset();
    sendPasswordResetMock.mockReset();
  });

  it('sends a password reset email from the sign-in form', async () => {
    sendPasswordResetMock.mockResolvedValue(undefined);

    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(sendPasswordResetMock).toHaveBeenCalledWith('student@example.com');
    });
    expect(
      await screen.findByText('If that email is registered, a password reset link has been sent.')
    ).toBeInTheDocument();
  });
});
