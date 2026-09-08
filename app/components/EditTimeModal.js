'use client';
import TimeWizardForm from './TimeWizardForm';

export default function EditTimeModal({ time, onClose, onSaved }) {
  return <TimeWizardForm time={time} onClose={onClose} onSaved={onSaved} />;
}
