/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export { Alert, AlertDescription, AlertTitle } from './alert';
export { Badge, badgeVariants, getBadgeStyleProps } from './badge';
export type { BadgeProps, BadgeStyle, BadgeTone, BadgeVariant } from './badge';
export { Button, buttonVariants } from './button';
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';
export { Input } from './input';
export { Label } from './label';
export { Progress } from './progress';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
export { Separator } from './separator';
export { Skeleton } from './skeleton';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Textarea } from './textarea';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export function SortButton({
  onClick,
  direction,
  children,
}: {
  onClick: () => void;
  direction: 'asc' | 'desc' | false;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
      {children}
      <span className="ml-1">
        {direction === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : direction === 'desc' ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </button>
  );
}
