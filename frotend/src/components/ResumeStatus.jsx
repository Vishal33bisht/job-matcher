import { FileText, Upload, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ResumeStatus() {
  const { hasResume, resumeData, uploadResume } = useStore();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadResume(file);
    }
  };

  if (!hasResume) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Resume Uploaded</p>
            <p className="text-sm text-gray-500">
              {resumeData?.fileName || 'resume.pdf'} • 
              Uploaded {new Date(resumeData?.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200">
          <Upload className="w-4 h-4" />
          Replace
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Skills extracted */}
      {resumeData?.parsed?.skills?.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-gray-600 mb-2">Detected Skills:</p>
          <div className="flex flex-wrap gap-2">
            {resumeData.parsed.skills.map((skill, i) => (
              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}