"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function JiraSection() {
    const t = useTranslations("admin-settings.integrations.jira");
    const settings = useIntegrationSettings("jira");
    const deployment = settings.field("deployment");
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} settings={settings}>
            <FieldRow label={t("deployment")} htmlFor={deployment.id}>
                <Select value={deployment.value || "data-center"} onValueChange={deployment.onChange} disabled={deployment.disabled}>
                    <SelectTrigger id={deployment.id}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="data-center">Data Center</SelectItem>
                        <SelectItem value="cloud">Cloud</SelectItem>
                    </SelectContent>
                </Select>
            </FieldRow>
            {field("baseUrl")}
            {deployment.value === "cloud" && field("email")}
            {field("token")}
            {field("project")}
            {field("assignee")}
            {field("issueTypeTask")}
            {field("issueTypeBug")}
        </IntegrationForm>
    );
}
