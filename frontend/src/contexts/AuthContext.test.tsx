import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import type { IntendedRole } from '../api/auth';

const verifyTokenMock = vi.fn();

vi.mock('../api/auth', () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
  logout: vi.fn(),
}));

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: (_auth: unknown, cb: (u: null) => void) => {
      cb(null);
      return () => {};
    },
    createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('id-token-signup') },
    }),
    signInWithPopup: vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('id-token-google') },
    }),
    signInWithEmailAndPassword: vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('id-token-signin') },
    }),
  };
});

vi.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
  githubProvider: {},
  facebookProvider: {},
}));

function CallSignUp({ role }: { role?: IntendedRole }) {
  const { signUpWithEmail } = useAuth();
  useEffect(() => {
    signUpWithEmail('a@b.test', 'password123', role ? { intendedRole: role } : undefined);
  }, [signUpWithEmail, role]);
  return <div>ready</div>;
}

function CallGoogle({ role }: { role?: IntendedRole }) {
  const { signInWithGoogle } = useAuth();
  useEffect(() => {
    signInWithGoogle(role ? { intendedRole: role } : undefined);
  }, [signInWithGoogle, role]);
  return <div>ready</div>;
}

function CallSignIn() {
  const { signInWithEmail } = useAuth();
  useEffect(() => {
    signInWithEmail('a@b.test', 'password123');
  }, [signInWithEmail]);
  return <div>ready</div>;
}

describe('AuthContext intendedRole forwarding', () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
    verifyTokenMock.mockResolvedValue({ success: true, user: { uid: 'u1' } });
    localStorage.clear();
  });

  it('forwards intendedRole on email signup', async () => {
    render(
      <AuthProvider>
        <CallSignUp role="teacher" />
      </AuthProvider>,
    );
    await screen.findByText('ready');
    await waitFor(() => {
      expect(verifyTokenMock).toHaveBeenCalledWith('id-token-signup', { intendedRole: 'teacher' });
    });
  });

  it('forwards intendedRole on Google sign-in', async () => {
    render(
      <AuthProvider>
        <CallGoogle role="admin" />
      </AuthProvider>,
    );
    await screen.findByText('ready');
    await waitFor(() => {
      expect(verifyTokenMock).toHaveBeenCalledWith('id-token-google', { intendedRole: 'admin' });
    });
  });

  it('omits intendedRole when not provided', async () => {
    render(
      <AuthProvider>
        <CallSignUp />
      </AuthProvider>,
    );
    await screen.findByText('ready');
    await waitFor(() => {
      expect(verifyTokenMock).toHaveBeenCalledWith('id-token-signup', undefined);
    });
  });

  it('signInWithEmail never forwards intendedRole (role-blind contract)', async () => {
    render(
      <AuthProvider>
        <CallSignIn />
      </AuthProvider>,
    );
    await screen.findByText('ready');
    await waitFor(() => {
      expect(verifyTokenMock).toHaveBeenCalledWith('id-token-signin');
    });
    // The second argument must be omitted entirely — login is for returning
    // users whose role comes from their memberships, not from a UI selection.
    const calls = verifyTokenMock.mock.calls;
    const signInCall = calls.find((c) => c[0] === 'id-token-signin');
    expect(signInCall).toBeDefined();
    expect(signInCall).toHaveLength(1);
  });
});
