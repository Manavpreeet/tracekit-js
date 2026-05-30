# @tracekit/sqs

Amazon SQS helpers for TraceKit request correlation. Works with the AWS SDK v3
`SendMessage` / consumer shapes without taking a direct SDK dependency.

## Install

```bash
pnpm add @tracekit/core @tracekit/sqs
```

## Producer

```ts
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { enrichSendMessageParams } from "@tracekit/sqs";

const client = new SQSClient({});

await client.send(
  new SendMessageCommand(
    enrichSendMessageParams({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({ action: "sync" })
    })
  )
);
```

## Consumer

```ts
import { processSqsMessageWithTrace } from "@tracekit/sqs";

const handleMessage = processSqsMessageWithTrace(async (message) => {
  console.log(getRequestId());
  return message;
});
```

Trace metadata is stored in the `__tracekit` message attribute as JSON.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
