import { X, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface EmbeddingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  embeddings: number[];
  fileName: string;
}

export function EmbeddingsModal({ isOpen, onClose, embeddings, fileName }: EmbeddingsModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(embeddings));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Embeddings</h2>
            <p className="text-sm text-gray-500 mt-1">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Vector dimensions: <span className="font-semibold">{embeddings.length}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(embeddings, null, 2)}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
