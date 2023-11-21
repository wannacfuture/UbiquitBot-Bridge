import { createClient } from "@supabase/supabase-js";
import zlib from "zlib";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { issueClosed } from "./handlers//issue/issue-closed";
import OpenAI from "openai";

const supabase = createClient(
  "https://waqlpadqzheuuwbvhqje.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhcWxwYWRxemhldXV3YnZocWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTgzNDczMDksImV4cCI6MjAxMzkyMzMwOX0.NmOgURHfeLdtxuAXkQcN-UfmD_Pg2Z5II1gJ14j2fg0"
);

// Define an asynchronous function to handle the logic
async function run() {
  try {
    const payload = JSON.parse(
      JSON.stringify(github.context.payload, undefined, 2)
    );
    const eventName = payload.inputs.eventName;
    const handlerPayload = JSON.parse(payload.inputs.payload);

    console.log(handlerPayload);

    if (eventName === "issueClosed") {
      const result: string = await issueClosed(
        handlerPayload.issue,
        handlerPayload.issueComments,
        new OpenAI(handlerPayload.openAiKey),
        handlerPayload.repoCollaborators,
        handlerPayload.pullRequestComments,
        handlerPayload.botConfig, 
        handlerPayload.X25519_PRIVATE_KEY,
      );
      const compressedString = zlib.gzipSync(
        Buffer.from(result.replace(/<!--[\s\S]*?-->/g, ""))
      );
      console.log(compressedString);
      core.setOutput("result", {
        comment: compressedString.toJSON(),
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Call the function
run();
