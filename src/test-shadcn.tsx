import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TestShadcn() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>shadcn/ui Test</CardTitle>
          <CardDescription>Testing shadcn components with TSGO</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you can see this card with proper styling, shadcn/ui is working correctly!
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </CardFooter>
      </Card>
    </div>
  )
}