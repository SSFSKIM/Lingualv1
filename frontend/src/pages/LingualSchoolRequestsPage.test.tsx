import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LingualSchoolRequestsPage } from './LingualSchoolRequestsPage';
import type { SchoolRequest } from '@/types';

const listSchoolRequestsMock = vi.fn();
const approveSchoolRequestMock = vi.fn();
const rejectSchoolRequestMock = vi.fn();

vi.mock('@/api/schoolRequests', () => ({
  listSchoolRequests: (...args: unknown[]) => listSchoolRequestsMock(...args),
  approveSchoolRequest: (...args: unknown[]) => approveSchoolRequestMock(...args),
  rejectSchoolRequest: (...args: unknown[]) => rejectSchoolRequestMock(...args),
}));

function makeRequest(overrides: Partial<SchoolRequest> = {}): SchoolRequest {
  return {
    id: 'req-1',
    requesterUid: 'uid-1',
    requesterEmail: 'ada@ssfs.org',
    requesterName: 'Ada Lovelace',
    schoolName: 'SF Friends',
    orgType: 'school',
    websiteUrl: 'https://ssfs.org',
    canvasInstanceUrl: '',
    status: 'pending',
    reviewedByUid: null,
    reviewedAt: null,
    rejectionReason: null,
    rejectionCategory: null,
    createdOrgId: null,
    createdAt: '2026-05-18T12:00:00Z',
    cancelledAt: null,
    preInvitedTeachers: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LingualSchoolRequestsPage />
    </MemoryRouter>,
  );
}

describe('LingualSchoolRequestsPage', () => {
  beforeEach(() => {
    listSchoolRequestsMock.mockReset();
    approveSchoolRequestMock.mockReset().mockResolvedValue(makeRequest({ status: 'approved' }));
    rejectSchoolRequestMock.mockReset().mockResolvedValue(makeRequest({ status: 'rejected' }));
  });

  it('shows pre-invited teacher count and emails during admin review', async () => {
    listSchoolRequestsMock.mockResolvedValueOnce([
      makeRequest({ preInvitedTeachers: ['t1@ssfs.org', 't2@ssfs.org'] }),
    ]);

    renderPage();

    await waitFor(() => expect(screen.getByText('SF Friends')).toBeInTheDocument());
    expect(screen.getByText('Pre-invited teachers (2)')).toBeInTheDocument();
    expect(screen.getByText('t1@ssfs.org')).toBeInTheDocument();
    expect(screen.getByText('t2@ssfs.org')).toBeInTheDocument();
  });

  it('requires both rejection reason and category before calling the reject API', async () => {
    listSchoolRequestsMock
      .mockResolvedValueOnce([makeRequest()])
      .mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => expect(screen.getByText('SF Friends')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));

    const confirm = screen.getByRole('button', { name: /confirm reject/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/reason for rejection/i), {
      target: { value: 'Website not reachable.' },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/rejection category/i), {
      target: { value: 'info_missing' },
    });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    await waitFor(() =>
      expect(rejectSchoolRequestMock).toHaveBeenCalledWith(
        'req-1',
        'Website not reachable.',
        'info_missing',
      ),
    );
  });
});
