import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface KeyboardShortcutsProps {
  onSave: () => void;
  onComplete: () => void;
  onUpdateGPS: () => void;
  onToggleOCR: () => void;
  onQuickFill: () => void;
}

export default function KeyboardShortcuts({ 
  onSave, 
  onComplete, 
  onUpdateGPS, 
  onToggleOCR,
  onQuickFill 
}: KeyboardShortcutsProps) {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in an input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
        toast({
          title: "Salvamento rápido",
          description: "Dados salvos via Ctrl+S",
        });
      }

      // Ctrl/Cmd + Enter: Complete
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onComplete();
      }

      // Ctrl/Cmd + G: Update GPS
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        onUpdateGPS();
        toast({
          title: "GPS atualizado",
          description: "Localização atualizada via Ctrl+G",
        });
      }

      // Ctrl/Cmd + O: Toggle OCR
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        onToggleOCR();
      }

      // Ctrl/Cmd + T: Quick fill templates
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        onQuickFill();
      }

      // F1: Show shortcuts help
      if (e.key === 'F1') {
        e.preventDefault();
        toast({
          title: "Atalhos de Teclado",
          description: "Ctrl+S: Salvar | Ctrl+Enter: Concluir | Ctrl+G: GPS | Ctrl+O: OCR | Ctrl+T: Templates",
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onComplete, onUpdateGPS, onToggleOCR, onQuickFill, toast]);

  return null; // This component doesn't render anything
}