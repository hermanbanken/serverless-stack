import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Accordion,
  Badge,
  Row,
  Spacer,
  Stack,
  Table,
  useOnScreen,
} from "~/components";
import { useFunctionQuery, useLogsQuery } from "~/data/aws/function";
import { useConstruct, useStackFromName, useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { FunctionMetadata } from "../../../../../resources/dist/Metadata";
import { useRealtimeState } from "~/data/global";

const Root = styled("div", {
  padding: "$xl",
  overflowX: "hidden",
  flexGrow: 1,
});

export function Detail() {
  const params = useParams();
  const stack = useStackFromName(params.stack!);
  const functionMetadata = useConstruct(
    "Function",
    params.stack!,
    params.function!
  );

  const func = useFunctionQuery(functionMetadata.data.arn);
  const [state] = useRealtimeState();
  const functionState = state.functions[functionMetadata.data.localId];

  if (func.isLoading) return <span />;
  if (!stack) return <span>Stack not found</span>;

  return (
    <Root>
      <Stack space="xl">
        <Row alignHorizontal="justify">
          <H1>{functionMetadata.id}</H1>
          <Badge>{stack.info.StackName}</Badge>
        </Row>
        {/*
        <Stack space="md">
          <H3>Environment</H3>
          <EnvironmentTable
            variables={func.data?.Environment?.Variables || {}}
          />
        </Stack>
          */}
        {functionState?.warm && (
          <Stack space="lg">
            <H3>History</H3>
            <History function={functionMetadata} />
          </Stack>
        )}
        {!functionState?.warm && (
          <Stack space="md">
            <H3>Logs</H3>
            <Logs functionName={func.data?.FunctionName!} />
          </Stack>
        )}
      </Stack>
    </Root>
  );
}

const LogRow = styled("div", {
  display: "flex",
  padding: "$md 0",
  fontSize: "$sm",
  borderTop: "1px solid $border",
  "&:first-child": {
    border: 0,
  },
});

const LogTime = styled("div", {
  flexShrink: 0,
  lineHeight: 1.75,
});

const LogMessage = styled("div", {
  flexGrow: 1,
  overflowX: "hidden",
  lineHeight: 1.75,
  wordWrap: "break-word",
});

const LogLoader = styled("div", {
  width: "100%",
  background: "$border",
  textAlign: "center",
  padding: "$md 0",
  fontWeight: 600,
  borderRadius: "6px",
});

const HistoryContent = styled("div", {
  border: "1px solid $border",
  fontSize: "$sm",
  lineHeight: 1.5,
});

const HistoryRow = styled("div", {
  padding: "$md",
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid $border",

  "& > *:first-child": {
    width: "200px",
    flexShrink: 0,
    marginRight: "$md",
  },
});

function History(props: { function: FunctionMetadata }) {
  const [state] = useRealtimeState();
  const history = state.functions[props.function.data.localId]?.history || [];
  if (!history) return <></>;

  return (
    <Accordion.Root type="multiple">
      {history.map((item) => (
        <Accordion.Item value={item.times.start.toString()}>
          <Accordion.Header>
            <Accordion.Trigger>
              {" "}
              {item.id} ({item.response?.type})
              <Accordion.Icon />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <HistoryContent>
              <HistoryRow>
                <div>
                  <Badge color="neutral" size="sm">
                    Request
                  </Badge>
                </div>
                {JSON.stringify(item.request, null, 2)}
              </HistoryRow>
              {item.logs?.map((log) => (
                <HistoryRow>
                  <div>{new Date(log.timestamp).toISOString()}</div>
                  <div>{log.message}</div>
                </HistoryRow>
              ))}
              <HistoryRow>
                <div>
                  {item.response?.type === "success" && (
                    <Badge color="success" size="sm">
                      Success
                    </Badge>
                  )}
                </div>
                {JSON.stringify(item.response, null, 2)}
              </HistoryRow>
            </HistoryContent>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function Logs(props: { functionName: string }) {
  const logs = useLogsQuery({
    functionName: props.functionName,
  });

  const ref: any = useRef<HTMLDivElement>();
  const loaderVisible = useOnScreen(ref);
  useEffect(() => {
    if (loaderVisible && logs.hasNextPage) logs.fetchNextPage();
  }, [loaderVisible]);

  return (
    <div
      onScroll={console.log}
      style={{
        width: "100%",
      }}
    >
      {logs.data?.pages
        .flatMap((page) => page.events)
        .map((entry, index) => (
          <LogRow key={index}>
            <LogTime>{new Date(entry?.timestamp!).toISOString()}</LogTime>
            <LogTime>{new Date(entry?.timestamp!).toISOString()}</LogTime>
            <Spacer horizontal="lg" />
            <LogMessage>{entry?.message}</LogMessage>
          </LogRow>
        ))}
      {
        <LogLoader ref={ref}>
          {logs.isError
            ? "No Logs"
            : logs.isLoading
            ? "Loading..."
            : logs.hasNextPage
            ? "Load More"
            : "End of stream"}
        </LogLoader>
      }
    </div>
  );
}

function EnvironmentTable(props: { variables: Record<string, string> }) {
  const variables = useMemo(
    () =>
      Object.entries(props.variables).filter(
        ([key]) => !key.startsWith("SST_")
      ),
    [props.variables]
  );
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>Key</Table.Header>
          <Table.Header>Value</Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {variables.map(([key, value]) => (
          <Table.Row key={key}>
            <Table.Cell>{key}</Table.Cell>
            <Table.Cell>{value}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}