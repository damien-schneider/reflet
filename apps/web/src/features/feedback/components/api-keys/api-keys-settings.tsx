"use client";

import { BookOpen, Copy, Key, Robot, Warning } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiPromptSection } from "./components/ai-prompt-section";
import { ApiKeyDialogs } from "./components/api-key-dialogs";
import { ApiKeysList } from "./components/api-keys-list";
import { IntegrationGuide } from "./components/integration-guide";
import { useApiKeys } from "./hooks/use-api-keys";

interface ApiKeysSettingsProps {
  organizationId: Id<"organizations">;
}

export function ApiKeysSettings({ organizationId }: ApiKeysSettingsProps) {
  const {
    apiKeys,
    showSecretKey,
    setShowSecretKey,
    newSecretKey,
    setNewSecretKey,
    isRegenerating,
    showRegenerateDialog,
    setShowRegenerateDialog,
    setSelectedKeyId,
    showDeleteDialog,
    setShowDeleteDialog,
    setKeyToDelete,
    domainInput,
    setDomainInput,
    newKeyName,
    setNewKeyName,
    isGenerating,
    handleGenerateKeys,
    handleRegenerateSecretKey,
    handleToggleActive,
    handleDeleteKey,
    handleAddDomain,
    handleRemoveDomain,
    copyToClipboard,
  } = useApiKeys({ organizationId });

  if (apiKeys === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Enable SDK Integration</h3>
              <p className="mt-1 text-muted-foreground">
                Generate API keys to enable the Reflet SDK in your application.
                Your users will be able to submit feedback, vote on ideas, and
                leave comments directly from your app.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">React Hooks</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Server-side Signing</Badge>
                <Badge variant="outline">Full API Access</Badge>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Input
                  className="max-w-xs"
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="API key name (e.g., Production)"
                  value={newKeyName}
                />
                <Button
                  disabled={isGenerating || !newKeyName.trim()}
                  onClick={handleGenerateKeys}
                >
                  <Key className="mr-2 h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate API Keys"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="ai">
          <TabsList>
            <TabsTrigger value="docs">
              <BookOpen className="mr-2 h-4 w-4" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Robot className="mr-2 h-4 w-4" />
              AI Prompt
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value="docs">
            <IntegrationGuide publicKey="fb_pub_xxxxxxxxxxxxxxxx" />
          </TabsContent>

          <TabsContent className="mt-6" value="ai">
            <AiPromptSection publicKey="fb_pub_xxxxxxxxxxxxxxxx" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  const firstKey = apiKeys[0];

  return (
    <div className="space-y-8">
      {newSecretKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Save your secret key now
              </h4>
              <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
                This is the only time you&apos;ll see your secret key. Copy it
                and store it securely in your environment variables.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
                  {newSecretKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(newSecretKey, "Secret key")}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="mt-3"
                onClick={() => setNewSecretKey(null)}
                size="sm"
                variant="ghost"
              >
                I&apos;ve saved my secret key
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="keys">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Robot className="mr-2 h-4 w-4" />
            AI Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6 space-y-6" value="keys">
          <ApiKeysList
            apiKeys={apiKeys}
            domainInput={domainInput}
            isGenerating={isGenerating}
            newKeyName={newKeyName}
            onAddDomain={handleAddDomain}
            onCopyToClipboard={copyToClipboard}
            onDelete={(id) => {
              setKeyToDelete(id);
              setShowDeleteDialog(true);
            }}
            onGenerateKeys={handleGenerateKeys}
            onRegenerate={(id) => {
              setSelectedKeyId(id);
              setShowRegenerateDialog(true);
            }}
            onRemoveDomain={handleRemoveDomain}
            onToggleActive={handleToggleActive}
            setDomainInput={setDomainInput}
            setNewKeyName={setNewKeyName}
            setShowSecretKey={setShowSecretKey}
            showSecretKey={showSecretKey}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="docs">
          <IntegrationGuide publicKey={firstKey?.publicKey ?? "fb_pub_xxx"} />
        </TabsContent>

        <TabsContent className="mt-6" value="ai">
          <AiPromptSection publicKey={firstKey?.publicKey ?? "fb_pub_xxx"} />
        </TabsContent>
      </Tabs>

      <ApiKeyDialogs
        isRegenerating={isRegenerating}
        onDelete={handleDeleteKey}
        onRegenerate={handleRegenerateSecretKey}
        setShowDeleteDialog={setShowDeleteDialog}
        setShowRegenerateDialog={setShowRegenerateDialog}
        showDeleteDialog={showDeleteDialog}
        showRegenerateDialog={showRegenerateDialog}
      />
    </div>
  );
}
