"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Bell, Settings, Loader2 } from "lucide-react";

export default function StyleguidePage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          UI Lab & Styleguide
        </h2>
        <p className="text-muted-foreground">
          Component library and design system reference
        </p>
      </div>

      <Tabs defaultValue="buttons" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
        </TabsList>

        <TabsContent value="buttons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>
                All button styles used in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button>Primary Action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 2000);
                  }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Loading..." : "Click to Load"}
                </Button>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  With Icon
                </Button>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button variant="ghost" className="gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Inputs, selects, and checkboxes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Text Input</Label>
                  <Input placeholder="Enter text..." />
                </div>

                <div className="space-y-2">
                  <Label>With Icon</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Search..." className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monospace (for placeholders)</Label>
                  <Input defaultValue="{{FirstName}}" className="font-mono" />
                </div>

                <div className="space-y-2">
                  <Label>Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Option 1</SelectItem>
                      <SelectItem value="2">Option 2</SelectItem>
                      <SelectItem value="3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Badges & Chips</CardTitle>
              <CardDescription>Status indicators and tags</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                  Success
                </Badge>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5" />
                  Pending
                </Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5" />
                  Error
                </Badge>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-primary/5 text-primary border-primary/20"
                >
                  Template Tag
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5"
                >
                  v2.4.1
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font families and text styles</CardDescription>
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">
                  Sans-serif (Open Sans)
                </Label>
                <p className="text-2xl font-bold">
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="text-base">
                  Regular text body. Lorem ipsum dolor sit amet, consectetur
                  adipiscing elit.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">
                  Serif (Georgia)
                </Label>
                <p className="text-xl font-serif">
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="font-serif text-muted-foreground">
                  Used for long-form text and email content.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">
                  Monospace (JetBrains Mono)
                </Label>
                <p className="font-mono text-sm">sub_98412_xm</p>
                <p className="font-mono text-sm text-primary">
                  {"{{FirstName}}"} {"{{LastName}}"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Used for IDs, placeholders, and code.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Design Tokens</CardTitle>
              <CardDescription>OKLCH color system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    name: "Primary",
                    var: "bg-primary",
                    text: "text-primary-foreground",
                  },
                  {
                    name: "Secondary",
                    var: "bg-secondary",
                    text: "text-secondary-foreground",
                  },
                  {
                    name: "Accent",
                    var: "bg-accent",
                    text: "text-accent-foreground",
                  },
                  {
                    name: "Muted",
                    var: "bg-muted",
                    text: "text-muted-foreground",
                  },
                  {
                    name: "Card",
                    var: "bg-card",
                    text: "text-card-foreground",
                  },
                  {
                    name: "Destructive",
                    var: "bg-destructive",
                    text: "text-destructive-foreground",
                  },
                  { name: "Border", var: "bg-border", text: "" },
                  { name: "Ring", var: "bg-ring", text: "" },
                ].map((color) => (
                  <div key={color.name} className="space-y-2">
                    <div
                      className={`h-16 ${color.var} rounded-custom border ${color.text ? color.text : ""} flex items-center justify-center font-mono text-xs`}
                    >
                      {color.text ? color.name : ""}
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {color.name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
