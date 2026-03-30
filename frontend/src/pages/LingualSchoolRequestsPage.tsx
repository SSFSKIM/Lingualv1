import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import {
  listSchoolRequests,
  approveSchoolRequest,
  rejectSchoolRequest,
} from '@/api/schoolRequests';
import { AnimatedPage } from '@/components/layout';
import { Alert, AlertDescription, Badge, Button, Card, Input } from '@/components/ui';
import type { SchoolRequest } from '@/types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function LingualSchoolRequestsPage() {
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === 'all' ? undefined : filter;
      const result = await listSchoolRequests(status);
      setRequests(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load requests.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await approveSchoolRequest(id);
      await fetchRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve request.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await rejectSchoolRequest(id, rejectReason.trim() || undefined);
      setRejectingId(null);
      setRejectReason('');
      await fetchRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reject request.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AnimatedPage>
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">
            School Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage school registration requests.
          </p>
        </header>

        {/* Status filter tabs */}
        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No {filter === 'all' ? '' : filter} requests found.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold">{req.schoolName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {req.requesterName} &middot; {req.requesterEmail}
                    </p>
                  </div>
                  <div>
                    {req.status === 'pending' && (
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {req.status === 'approved' && (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    )}
                    {req.status === 'rejected' && (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">{req.orgType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>{' '}
                    <span className="font-medium">
                      {formatDate(req.createdAt)}
                    </span>
                  </div>
                  {req.websiteUrl && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Website:</span>{' '}
                      <a
                        href={req.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {req.websiteUrl}
                      </a>
                    </div>
                  )}
                  {req.canvasInstanceUrl && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Canvas:</span>{' '}
                      <span className="font-medium">
                        {req.canvasInstanceUrl}
                      </span>
                    </div>
                  )}
                </div>

                {req.status === 'rejected' && req.rejectionReason && (
                  <Alert>
                    <AlertDescription>
                      <strong>Reason:</strong> {req.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    {rejectingId === req.id ? (
                      <div className="flex w-full flex-col gap-2">
                        <Input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection (optional)"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex-1"
                          >
                            {actionLoading === req.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm Reject
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="default"
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setRejectingId(req.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
