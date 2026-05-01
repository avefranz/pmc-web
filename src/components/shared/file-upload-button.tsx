import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploadButtonProps {
  onFile: (file: File) => void;
  accept?: string;
  loading?: boolean;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function FileUploadButton({
  onFile,
  accept = "image/*",
  loading,
  label = "Upload",
  variant = "outline",
  size = "sm",
}: FileUploadButtonProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <Button
        variant={variant}
        size={size}
        disabled={loading}
        onClick={() => ref.current?.click()}
      >
        <Upload className="h-4 w-4 mr-1" />
        {loading ? "Uploading..." : label}
      </Button>
    </>
  );
}
