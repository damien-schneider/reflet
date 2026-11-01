import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import {
  PageActions,
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
  type PageWidth,
} from "@ctrl-ui/react/ui/page-layout";
import { useId } from "react";

interface SettingsPageProps {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
  width?: PageWidth;
}

export function SettingsPage({
  actions,
  children,
  description,
  title,
  width = "content",
}: SettingsPageProps) {
  return (
    <PageLayout width={width}>
      <PageHeader>
        <PageTitle>{title}</PageTitle>
        {description ? <PageDescription>{description}</PageDescription> : null}
        {actions ? <PageActions>{actions}</PageActions> : null}
      </PageHeader>
      <PageBody contentClassName="flex flex-col gap-14">{children}</PageBody>
    </PageLayout>
  );
}

interface SettingsSectionProps {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}

export function SettingsSection({
  actions,
  children,
  description,
  title,
}: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-balance text-heading-3" id={headingId}>
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-pretty text-body text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

interface SettingsRowProps {
  children: React.ReactNode;
  description?: React.ReactNode;
  descriptionId?: string;
  htmlFor?: string;
  label: React.ReactNode;
}

export function SettingsRow({
  children,
  description,
  descriptionId,
  htmlFor,
  label,
}: SettingsRowProps) {
  return (
    <Field orientation="responsive">
      <FieldContent>
        <FieldLabel className="flex items-center gap-2" htmlFor={htmlFor}>
          {label}
        </FieldLabel>
        {description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <div className="flex @md/field-group:w-1/2 w-full flex-col @md/field-group:items-end gap-1.5">
        {children}
      </div>
    </Field>
  );
}
