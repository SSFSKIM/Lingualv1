import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Loader2, School, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedPage } from '@/components/layout';
import { Alert, AlertDescription, Badge, Button, Card, Input } from '@/components/ui';
import {
  getMySchoolRequest,
  submitSchoolRequest,
} from '@/api/schoolRequests';
import type { SchoolRequest } from '@/types';

const ORG_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'district', label: 'District' },
  { value: 'program', label: 'Language Institute' },
] as const;

export function SchoolRequestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<SchoolRequest | null>(null);

  // Form state
  const [schoolName, setSchoolName] = useState('');
  const [orgType, setOrgType] = useState('school');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [canvasInstanceUrl, setCanvasInstanceUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const request = await getMySchoolRequest();
        setExisting(request);
      } catch {
        // No existing request — show form
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!schoolName.trim()) {
      setError('School name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const request = await submitSchoolRequest({
        schoolName: schoolName.trim(),
        orgType,
        websiteUrl: websiteUrl.trim() || undefined,
        canvasInstanceUrl: canvasInstanceUrl.trim() || undefined,
      });
      setExisting(request);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setExisting(null);
    setSchoolName('');
    setOrgType('school');
    setWebsiteUrl('');
    setCanvasInstanceUrl('');
    setError(null);
  };

  if (loading) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AnimatedPage>
    );
  }

  // --- Existing request: show status ---
  if (existing) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="p-8 text-center space-y-6">
              {existing.status === 'pending' && (
                <>
                  <div className="flex justify-center">
                    <Clock className="h-16 w-16 text-yellow-500" />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="warning">Pending Review</Badge>
                    <h1 className="text-2xl font-bold">{existing.schoolName}</h1>
                    <p className="text-muted-foreground">
                      We're reviewing your request. You'll be notified once it's
                      been processed.
                    </p>
                  </div>
                </>
              )}

              {existing.status === 'approved' && (
                <>
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="success">Approved</Badge>
                    <h1 className="text-2xl font-bold">
                      Your school has been approved!
                    </h1>
                    <p className="text-muted-foreground">
                      {existing.schoolName} is ready to go. Head to your teacher
                      dashboard to get started.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/app/teacher', { replace: true })}
                    className="w-full"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {existing.status === 'rejected' && (
                <>
                  <div className="flex justify-center">
                    <XCircle className="h-16 w-16 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="destructive">Rejected</Badge>
                    <h1 className="text-2xl font-bold">Request Not Approved</h1>
                    {existing.rejectionReason && (
                      <Alert>
                        <AlertDescription>
                          {existing.rejectionReason}
                        </AlertDescription>
                      </Alert>
                    )}
                    <p className="text-muted-foreground">
                      You can submit a new request if you'd like to try again.
                    </p>
                  </div>
                  <Button onClick={handleNewRequest} className="w-full">
                    Submit New Request
                  </Button>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      </AnimatedPage>
    );
  }

  // --- No existing request: show form ---
  return (
    <AnimatedPage>
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <School className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Register Your School</h1>
              <p className="text-muted-foreground">
                Tell us about your school so we can set up your account.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                label="School Name"
                value={schoolName}
                onChange={(e) => {
                  setSchoolName(e.target.value);
                  setError(null);
                }}
                placeholder="Lincoln High School"
                required
                autoFocus
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Organization Type</p>
                <div className="flex gap-3">
                  {ORG_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                        orgType === t.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-secondary/40 hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="orgType"
                        value={t.value}
                        checked={orgType === t.value}
                        onChange={(e) => setOrgType(e.target.value)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="School Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.lincolnhs.edu"
                type="url"
              />

              <Input
                label="Canvas Instance URL"
                value={canvasInstanceUrl}
                onChange={(e) => setCanvasInstanceUrl(e.target.value)}
                placeholder="https://school.instructure.com"
                type="url"
              />

              <Button
                onClick={handleSubmit}
                disabled={submitting || !schoolName.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
