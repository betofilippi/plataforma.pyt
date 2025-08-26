import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
}

export function SimpleDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  placeholder,
  defaultValue = ""
}: SimpleDialogProps) {
  const [value, setValue] = useState(defaultValue);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/20" 
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg border border-gray-200 shadow-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="input-value">Digite a URL do webhook:</Label>
            <Input
              id="input-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="mt-1"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!value.trim()}
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
