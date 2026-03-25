import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { validateCanvasConnection, connectCanvas } from '@/api/canvas';
import type { CanvasCourse } from '@/types/canvas';

type Step = 'credentials' | 'course-select';

export function CanvasConnectPage() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const existingClassId = classId || searchParams.get('classId') || '';
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('credentials');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [pat, setPat] = useState('');
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await validateCanvasConnection(instanceUrl.trim(), pat.trim());
      if (!result.success) {
        setError(result.error || 'Validation failed');
        return;
      }
      setCourses(result.courses);
      if (result.courses.length > 0) {
        setSelectedCourseId(String(result.courses[0].id));
      }
      setStep('course-select');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const course = courses.find((c) => String(c.id) === selectedCourseId);
    if (!course) return;

    setError(null);
    setLoading(true);
    try {
      const result = await connectCanvas({
        canvasInstanceUrl: instanceUrl.trim(),
        pat: pat.trim(),
        canvasCourseId: String(course.id),
        canvasCourseName: course.name,
        existingClassId: existingClassId || undefined,
      });
      if (!result.success) {
        setError(result.error || 'Connection failed');
        return;
      }
      navigate(`/app/teacher/classes/${result.classId}/analytics`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold">Connect Canvas LMS</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'credentials' && (
        <form onSubmit={handleValidate} className="space-y-4">
          <div>
            <label htmlFor="canvas-url" className="mb-1 block text-sm font-medium">
              Canvas Instance URL
            </label>
            <input
              id="canvas-url"
              type="url"
              required
              placeholder="https://school.instructure.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="canvas-pat" className="mb-1 block text-sm font-medium">
              Personal Access Token
            </label>
            <input
              id="canvas-pat"
              type="password"
              required
              placeholder="Your Canvas PAT"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Validate & Continue'}
          </button>
        </form>
      )}

      {step === 'course-select' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the Canvas course to connect:
          </p>
          <div className="space-y-2">
            {courses.map((course) => (
              <label
                key={course.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${
                  String(course.id) === selectedCourseId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="course"
                  value={String(course.id)}
                  checked={String(course.id) === selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                />
                <div>
                  <div className="font-medium">{course.name}</div>
                  {course.courseCode && (
                    <div className="text-xs text-gray-500">{course.courseCode}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="rounded-md border px-4 py-2"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading || !selectedCourseId}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
