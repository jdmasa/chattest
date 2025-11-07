import { useState, useEffect } from 'react';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatInterface } from './components/ChatInterface';
import { APIConfigModal } from './components/APIConfigModal';
import { EmbeddingsModal } from './components/EmbeddingsModal';
import { db, Conversation } from './lib/db';
import { apiService, APIConfig } from './lib/apiService';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isEmbeddingsModalOpen, setIsEmbeddingsModalOpen] = useState(false);
  const [embeddings, setEmbeddings] = useState<number[]>([]);
  const [embeddingsFileName, setEmbeddingsFileName] = useState('');
  const [apiConfig, setApiConfig] = useState<(APIConfig & { model: string }) | null>(null);

  useEffect(() => {
    loadConversations();
    loadSavedConfig();
  }, []);

  const loadConversations = async () => {
    const allConversations = await db.getAllConversations();
    setConversations(allConversations);
  };

  const loadSavedConfig = () => {
    const saved = localStorage.getItem('apiConfig');
    if (saved) {
      setApiConfig(JSON.parse(saved));
    }
  };

  const saveConfig = (config: APIConfig & { model: string }) => {
    setApiConfig(config);
    localStorage.setItem('apiConfig', JSON.stringify(config));
  };

  const getCurrentConversation = () => {
    return conversations.find((c) => c.id === currentConversationId);
  };

  const handleNewConversation = () => {
    if (!apiConfig) {
      setIsConfigModalOpen(true);
      return;
    }

    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      apiConfig: {
        hostname: apiConfig.hostname,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
      },
    };

    db.saveConversation(newConversation);
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    const conversation = getCurrentConversation();
    if (!conversation || !apiConfig) return;

    const attachmentData = attachments
      ? await Promise.all(
          attachments.map(async (file) => ({
            name: file.name,
            type: file.type,
            data: await apiService.readFileAsBase64(file),
          }))
        )
      : undefined;

    const userMessage = {
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      attachments: attachmentData,
    };

    const updatedMessages = [...conversation.messages, userMessage];

    let updatedConversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
      title:
        conversation.messages.length === 0
          ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
          : conversation.title,
    };

    await db.saveConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversation.id ? updatedConversation : c))
    );

    try {
      let messageContent = content;

      if (attachments && attachments.length > 0) {
        const textAttachments = await Promise.all(
          attachments
            .filter((f) => f.type.startsWith('text/'))
            .map(async (f) => {
              const text = await apiService.readFileAsText(f);
              return `\n\nFile: ${f.name}\n${text}`;
            })
        );

        messageContent = content + textAttachments.join('');
      }

      const response = await apiService.sendChatMessage(apiConfig, {
        model: apiConfig.model,
        messages: [
          ...updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ].slice(-10),
      });

      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: Date.now(),
      };

      updatedConversation = {
        ...updatedConversation,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: Date.now(),
      };

      await db.saveConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? updatedConversation : c))
      );
    } catch (error) {
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };

      updatedConversation = {
        ...updatedConversation,
        messages: [...updatedMessages, errorMessage],
        updatedAt: Date.now(),
      };

      await db.saveConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? updatedConversation : c))
      );
    }
  };

  const handleExtractEmbeddings = async (file: File) => {
    if (!apiConfig) return;

    try {
      const text = await apiService.readFileAsText(file);
      const embeddingVector = await apiService.getEmbedding(apiConfig, {
        model: apiConfig.model,
        input: text,
      });

      setEmbeddings(embeddingVector);
      setEmbeddingsFileName(file.name);
      setIsEmbeddingsModalOpen(true);
    } catch (error) {
      alert(`Failed to extract embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await db.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(undefined);
    }
  };

  const handleSaveConfig = (config: APIConfig & { model: string }) => {
    saveConfig(config);
    if (!currentConversationId) {
      handleNewConversation();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsConfigModalOpen(true)}
      />

      <ChatInterface
        conversation={getCurrentConversation() || null}
        onSendMessage={handleSendMessage}
        onExtractEmbeddings={handleExtractEmbeddings}
      />

      <APIConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleSaveConfig}
        initialConfig={apiConfig || undefined}
      />

      <EmbeddingsModal
        isOpen={isEmbeddingsModalOpen}
        onClose={() => setIsEmbeddingsModalOpen(false)}
        embeddings={embeddings}
        fileName={embeddingsFileName}
      />
    </div>
  );
}

export default App;
