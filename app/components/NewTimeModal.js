'use client';
import TimeWizardForm from './TimeWizardForm';

export default function NewTimeModal({ onClose, onCreated }) {
  return <TimeWizardForm onClose={onClose} onSaved={onCreated} />;
}
