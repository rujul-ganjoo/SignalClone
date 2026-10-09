'use client';

import React from 'react';
import { X, Phone, Disc, Shield } from 'lucide-react';

interface FeaturePlaceholderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'calls' | 'stories' | 'devices';
}

export const FeaturePlaceholderDialog: React.FC<FeaturePlaceholderDialogProps> = ({
  isOpen,
  onClose,
  feature,
}) => {
  if (!isOpen) return null;

  const contentMap = {
    calls: {
      title: 'Signal Encrypted Calling',
      icon: Phone,
      description: 'End-to-end encrypted audio and video calling with ultra-low latency WebRTC will be enabled in an upcoming release.',
      status: 'Coming Soon',
    },
    stories: {
      title: 'Signal Stories',
      icon: Disc,
      description: 'Share photos, text, and updates that disappear automatically after 24 hours with your selected contacts.',
      status: 'Coming Soon',
    },
    devices: {
      title: 'Linked Devices',
      icon: Shield,
      description: 'Scan a QR code from Signal Desktop or Signal iPad to sync your encrypted messages across multiple clients.',
      status: 'Coming Soon',
    },
  };

  const item = contentMap[feature] || contentMap.calls;
  const Icon = item.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#202124] rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-200 dark:border-zinc-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-signal-blue/10 text-signal-blue mx-auto flex items-center justify-center mb-4">
          <Icon className="w-8 h-8" />
        </div>

        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-signal-blue text-[11px] font-bold uppercase tracking-wider mb-2 inline-block">
          {item.status}
        </span>

        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
          {item.title}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          {item.description}
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-signal-blue text-white font-semibold text-xs hover:bg-signal-blue-hover transition-colors shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

