import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils"; // shadcn 템플릿 기준. 없으면 간단한 join 유틸로 대체해도 OK.
import { Loader2 } from "lucide-react";

type ConfirmDialogProps = {
  /** 컨트롤 모드 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** 본문 */
  title: React.ReactNode;
  description?: React.ReactNode;

  /** 액션 */
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;

  /** 상태/스타일 */
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
  /** 트리거 버튼(선택) — 제공 시 asChild로 감쌈 */
  trigger?: React.ReactNode;

  /** 타이틀 정렬 */
  align?: "start" | "center";
  /** 커스텀 클래스 */
  className?: string;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancle",
  onConfirm,
  onCancel,
  disabled,
  loading,
  destructive,
  icon,
  trigger,
  className,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    if (disabled || loading) return;
    await onConfirm?.();
    // 모달 닫기는 부모가 open 상태를 제어할 때 외부에서 처리 (uncontrolled면 자동 닫힘)
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}

      <AlertDialogContent className={cn("max-w-96", className)}>
        <AlertDialogHeader className="space-y-2">
          <div className="flex gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        {description && (
          <span className="whitespace-pre text-sm text-muted-foreground">
            {description}
          </span>
        )}
        <AlertDialogFooter className="flex flex-row justify-end gap-2 w-full">
          <AlertDialogCancel onClick={onCancel} disabled={loading} className="">
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disabled || loading}
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
