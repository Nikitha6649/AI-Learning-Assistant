
'use client';

import { Header } from '@/components/Header';
import { QueryInputForm } from '@/components/QueryInputForm';
import { ResponseDisplay } from '@/components/ResponseDisplay';
import { EngagementMonitorPanel } from '@/components/EngagementMonitorPanel'; // Import the new panel
import { submitQueryAction } from '@/app/actions';
import { type FormState, initialFormState } from '@/lib/form-state';
import { useActionState } from 'react';

export default function Home() {
  const [currentFormState, formDispatch, isFormPending] = useActionState(submitQueryAction, initialFormState);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <QueryInputForm formAction={formDispatch} state={currentFormState} />
        </div>
        {/* This div will act as the conversation panel for now */}
        <div className="lg:w-1/3">
          <ResponseDisplay
            isLoading={isFormPending}
            textResponse={currentFormState?.textResponse}
            chartDataUri={currentFormState?.chartDataUri}
            errors={currentFormState?.errors}
            message={currentFormState?.message}
          />
        </div>
        <div className="lg:w-1/3">
          <EngagementMonitorPanel />
        </div>
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm border-t mt-12 bg-white">
        <p>&copy; {new Date().getFullYear()} AI-Powered Interactive Learning Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}
