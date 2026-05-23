{{/*
Expand the name of the chart.
*/}}
{{- define "lims.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "lims.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "lims.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "lims.labels" -}}
helm.sh/chart: {{ include "lims.chart" . }}
{{ include "lims.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "lims.selectorLabels" -}}
app.kubernetes.io/name: {{ include "lims.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "lims.backend.labels" -}}
{{ include "lims.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "lims.backend.selectorLabels" -}}
{{ include "lims.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "lims.frontend.labels" -}}
{{ include "lims.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "lims.frontend.selectorLabels" -}}
{{ include "lims.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the image name for backend
*/}}
{{- define "lims.backend.image" -}}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.backend.image.repository .Values.backend.image.tag }}
{{- end }}

{{/*
Create the image name for frontend
*/}}
{{- define "lims.frontend.image" -}}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "lims.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" .Release.Name }}
{{- else if .Values.postgres.enabled }}
{{- printf "%s-postgres" (include "lims.fullname" .) }}
{{- else }}
{{- .Values.externalDatabase.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "lims.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- "5432" }}
{{- else if .Values.postgres.enabled }}
{{- "5432" }}
{{- else }}
{{- .Values.externalDatabase.port | default "5432" }}
{{- end }}
{{- end }}

{{/*
PostgreSQL database name
*/}}
{{- define "lims.postgresql.database" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database }}
{{- else if .Values.postgres.enabled }}
{{- .Values.postgres.auth.database }}
{{- else }}
{{- .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
PostgreSQL username
*/}}
{{- define "lims.postgresql.username" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.username }}
{{- else if .Values.postgres.enabled }}
{{- .Values.postgres.auth.username }}
{{- else }}
{{- .Values.externalDatabase.username }}
{{- end }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "lims.databaseUrl" -}}
{{- printf "postgresql://%s:$(DATABASE_PASSWORD)@%s:%s/%s" (include "lims.postgresql.username" .) (include "lims.postgresql.host" .) (include "lims.postgresql.port" .) (include "lims.postgresql.database" .) }}
{{- end }}
