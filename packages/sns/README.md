# @tracekit/sns

Amazon SNS publish helpers for TraceKit request correlation. Works with the
AWS SDK v3 `Publish` input shape without taking a direct SDK dependency.

## Install

```bash
pnpm add @tracekit/core @tracekit/sns
```

## Publish

```ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { enrichSnsPublishInput } from "@tracekit/sns";

const client = new SNSClient({});

await client.send(
  new PublishCommand(
    enrichSnsPublishInput({
      TopicArn: process.env.TOPIC_ARN,
      Message: JSON.stringify({ action: "notify" })
    })
  )
);
```

When SNS fans out to SQS with raw message delivery disabled, subscribers should
read the `__tracekit` message attribute from the SQS message (see
`@tracekit/sqs`).

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
