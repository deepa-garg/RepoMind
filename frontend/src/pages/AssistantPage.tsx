import React from 'react';
import { AssistantChat } from '../components/chat/AssistantChat';

export const AssistantPage: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-dark-950 overflow-hidden">
      <AssistantChat />
    </div>
  );
};
