"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { OIDC_CALLBACK_PATH } from "@/lib/auth-types";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function OidcSection() {
    const t = useTranslations("admin-settings.integrations.oidc");
    const settings = useIntegrationSettings("oidc");
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    // The URL the admin registers at the identity provider; the origin is only known in the browser.
    const [callbackUrl, setCallbackUrl] = useState("");
    useEffect(() => {
        setCallbackUrl(`${window.location.origin}${OIDC_CALLBACK_PATH}`);
    }, []);

    return (
        <IntegrationForm title={t("title")} settings={settings}>
            <FieldRow label={t("callbackUrl")} htmlFor="integration-oidc-callback-url">
                <Input
                    id="integration-oidc-callback-url"
                    value={callbackUrl}
                    readOnly
                    className="select-all"
                    onFocus={(e) => e.target.select()}
                />
            </FieldRow>
            {field("issuer")}
            {field("clientId")}
            {field("clientSecret")}
        </IntegrationForm>
    );
}
