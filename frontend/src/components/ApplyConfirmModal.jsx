import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ApplyConfirmModal() {
  const { showApplyConfirm, pendingJob, confirmApplication } = useStore();

  if (!showApplyConfirm || !pendingJob) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Track Your Application</h2>
        <p className="text-gray-600 mb-6">
          Did you apply to <span className="font-semibold">{pendingJob.title}</span> at{' '}
          <span className="font-semibold">{pendingJob.company}</span>?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => confirmApplication('applied')}
            className="w-full flex items-center gap-3 p-3 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
          >
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="font-medium text-gray-900">Yes, I Applied</span>
          </button>

          <button
            onClick={() => confirmApplication('browsing')}
            className="w-full flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <XCircle className="w-6 h-6 text-gray-400" />
            <span className="font-medium text-gray-700">No, Just Browsing</span>
          </button>

          <button
            onClick={() => confirmApplication('applied_earlier')}
            className="w-full flex items-center gap-3 p-3 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Clock className="w-6 h-6 text-blue-500" />
            <span className="font-medium text-gray-700">Applied Earlier</span>
          </button>
        </div>
      </div>
    </div>
  );
}