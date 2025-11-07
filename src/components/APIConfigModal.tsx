import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { apiService, APIConfig, Model } from '../lib/apiService';

interface APIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIConfig & { model: string }) => void;
  initialConfig?: APIConfig & { model?: string };
}

export function APIConfigModal({ isOpen, onClose, onSave, initialConfig }: APIConfigModalProps) {
  const [hostname, setHostname] = useState(initialConfig?.hostname || '');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(initialConfig?.model || '');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setHostname(initialConfig.hostname);
      setApiKey(initialConfig.apiKey || '');
      setSelectedModel(initialConfig.model || '');
    }
  }, [initialConfig]);

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');
    setTestSuccess(false);

    try {
      const config: APIConfig = {
        hostname,
        apiKey: apiKey || undefined,
      };

      const fetchedModels = await apiService.fetchModels(config);
      setModels(fetchedModels);
      setTestSuccess(true);

      if (fetchedModels.length > 0 && !selectedModel) {
        setSelectedModel(fetchedModels[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!hostname || !selectedModel) {
      setError('Please provide hostname and select a model');
      return;
    }

    onSave({
      hostname,
      apiKey: apiKey || undefined,
      model: selectedModel,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Hostname
            </label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="api.openai.com or localhost:11434"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key (optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleTestConnection}
            disabled={!hostname || loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Testing Connection...' : 'Test Connection & Load Models'}
          </button>

          {testSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Connection successful!</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {models.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hostname || !selectedModel}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
