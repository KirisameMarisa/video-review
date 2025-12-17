'use client';

import 'swagger-ui-react/swagger-ui.css';
import dynamic from "next/dynamic";

const SwaggerUI = dynamic(
  () => import("swagger-ui-react"),
  { ssr: false }
);

type Props = {
    spec: Record<string, any>;
    url: string | undefined
};

export default function ReactSwagger({ spec, url }: Props) {
    if (process.env.NODE_ENV === 'development') {
        return <SwaggerUI spec={spec} />
    } else {
        return <SwaggerUI url={url} />
    }
}