import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Dna, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const Connect = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Connect an AI assistant — OncoGene Annotator</title>
        <meta name="description" content="Connect ChatGPT, Claude, or another AI assistant to OncoGene Annotator via MCP." />
      </Helmet>

      <header className="border-b bg-card">
        <div className="container max-w-4xl py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground tracking-tight">OncoGene Annotator</div>
              <p className="text-xs text-muted-foreground">Connect an AI assistant</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl py-10 space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-foreground mb-2">Connect an AI assistant to this app</h1>
          <p className="text-sm text-muted-foreground">
            Paste the URL below into ChatGPT or Claude so the assistant can call OncoGene Annotator's
            gene-annotation tools as you. You'll sign in when the assistant connects.
          </p>
        </section>

        <section>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            MCP server URL
          </label>
          <div className="mt-2 flex items-center gap-2 border rounded-lg bg-card p-3">
            <code className="flex-1 text-sm break-all text-foreground">{MCP_URL}</code>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">Connect</h2>
          <Tabs defaultValue="chatgpt">
            <TabsList>
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
            </TabsList>
            <TabsContent value="chatgpt" className="pt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
                <li>
                  Open{" "}
                  <a
                    className="text-primary hover:underline inline-flex items-center gap-1"
                    href="https://chatgpt.com/#settings/Connectors/Advanced"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ChatGPT → Settings → Connectors → Advanced <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  and enable <strong>Developer mode</strong> (read the risk notice shown there).
                </li>
                <li>In the chat composer's "+" menu, turn on <strong>Developer mode</strong>.</li>
                <li>Click <strong>Add sources</strong>, then <strong>Connect more</strong>.</li>
                <li>Name the connector and paste the MCP URL above.</li>
                <li>Sign in when prompted, then ask ChatGPT to use the app.</li>
              </ol>
            </TabsContent>
            <TabsContent value="claude" className="pt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
                <li>
                  Open{" "}
                  <a
                    className="text-primary hover:underline inline-flex items-center gap-1"
                    href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Claude → Connectors → Add custom connector <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </li>
                <li>Name the connector and paste the MCP URL above.</li>
                <li>Enable the connector from the chat composer, sign in when prompted, then ask Claude to use the app.</li>
              </ol>
            </TabsContent>
          </Tabs>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-1">Refresh after the app changes</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Connected assistants cache the tool list. After we ship updates, refresh the connector to pick them up.
          </p>
          <Tabs defaultValue="chatgpt">
            <TabsList>
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
            </TabsList>
            <TabsContent value="chatgpt" className="pt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
                <li>Open ChatGPT's app preferences and pick this app under <strong>Enabled apps</strong>.</li>
                <li>Next to <strong>Information</strong>, click <strong>Refresh</strong>.</li>
                <li>If the URL changed, paste the latest URL from above.</li>
                <li>Start a new chat and ask ChatGPT to use the app.</li>
              </ol>
            </TabsContent>
            <TabsContent value="claude" className="pt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
                <li>Open the Connectors page and select this connector.</li>
                <li>Refresh or update the connector's tools.</li>
                <li>If the URL changed, paste the latest URL from above.</li>
                <li>Ask Claude to use the app.</li>
              </ol>
            </TabsContent>
          </Tabs>
        </section>

        <section className="text-xs text-muted-foreground border-t pt-4">
          The assistant can look up cancer-focused annotations for one gene, or triage CIViC/DGIdb signals across a
          cohort of symbols. Data comes from CIViC, DGIdb, and MyGene.info — for research use only.
        </section>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a href="https://accelbio.pt/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          AccelBio
        </a>
      </footer>
    </div>
  );
};

export default Connect;
