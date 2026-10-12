import React from 'react';
import { AssistantChat } from '../components/chat/AssistantChat';

export const AssistantPage: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-theme-bg overflow-hidden">
      <AssistantChat />
    </div>
  );
};
