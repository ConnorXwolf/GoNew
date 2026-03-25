import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <Card className="max-w-md w-full border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle /> 應用程式發生錯誤
              </CardTitle>
              <CardDescription>
                很抱歉，系統發生了預期外的錯誤。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 p-3 rounded text-xs font-mono text-red-800 overflow-auto max-h-40">
                {this.state.errorInfo}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
                重新整理頁面
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
