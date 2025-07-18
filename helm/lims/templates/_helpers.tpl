{{/*
Expand the name of the chart.
*/}}
{{- define "lims.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
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
app.kubernetes.io/part-of: labscientific-lims
{{- end }}

{{/*
Selector labels
*/}}
{{- define "lims.selectorLabels" -}}
app.kubernetes.io/name: {{ include "lims.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "lims.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "lims.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the config map to use
*/}}
{{- define "lims.configMapName" -}}
{{- if .Values.configMap.enabled }}
{{- printf "%s-config" (include "lims.fullname" .) }}
{{- else }}
{{- printf "%s-config" (include "lims.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create the name of the secret to use
*/}}
{{- define "lims.secretName" -}}
{{- if .Values.secrets.enabled }}
{{- printf "%s-secret" (include "lims.fullname" .) }}
{{- else }}
{{- printf "%s-secret" (include "lims.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create the name of the persistent volume claim to use
*/}}
{{- define "lims.pvcName" -}}
{{- if .Values.persistence.enabled }}
{{- printf "%s-data" (include "lims.fullname" .) }}
{{- else }}
{{- printf "%s-data" (include "lims.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create PostgreSQL connection string
*/}}
{{- define "lims.postgresql.connectionString" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password .Release.Name .Values.postgresql.auth.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:5432/%s" .Values.externalDatabase.username .Values.externalDatabase.password .Values.externalDatabase.host .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
Create Redis connection string
*/}}
{{- define "lims.redis.connectionString" -}}
{{- if .Values.redis.enabled }}
{{- printf "redis://:%s@%s-redis-master:6379" .Values.redis.auth.password .Release.Name }}
{{- else }}
{{- printf "redis://:%s@%s:6379" .Values.externalRedis.password .Values.externalRedis.host }}
{{- end }}
{{- end }}

{{/*
Create ingress hostname
*/}}
{{- define "lims.ingress.hostname" -}}
{{- if .Values.ingress.hosts }}
{{- (index .Values.ingress.hosts 0).host }}
{{- else }}
{{- printf "%s.local" (include "lims.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create monitoring labels
*/}}
{{- define "lims.monitoring.labels" -}}
{{ include "lims.labels" . }}
monitoring: "true"
{{- end }}

{{/*
Create backup labels
*/}}
{{- define "lims.backup.labels" -}}
{{ include "lims.labels" . }}
backup: "true"
{{- end }}

{{/*
Create security labels
*/}}
{{- define "lims.security.labels" -}}
{{ include "lims.labels" . }}
security: "true"
{{- end }}

{{/*
Validate required values
*/}}
{{- define "lims.validateValues" -}}
{{- if not .Values.app.image.repository }}
{{- fail "app.image.repository is required" }}
{{- end }}
{{- if not .Values.app.image.tag }}
{{- fail "app.image.tag is required" }}
{{- end }}
{{- if and .Values.postgresql.enabled (not .Values.postgresql.auth.password) }}
{{- fail "postgresql.auth.password is required when postgresql is enabled" }}
{{- end }}
{{- if and .Values.redis.enabled (not .Values.redis.auth.password) }}
{{- fail "redis.auth.password is required when redis is enabled" }}
{{- end }}
{{- end }}

{{/*
Create resource limits
*/}}
{{- define "lims.resources" -}}
{{- if .Values.app.containers.backend.resources }}
{{- toYaml .Values.app.containers.backend.resources }}
{{- else }}
limits:
  cpu: 1000m
  memory: 1Gi
requests:
  cpu: 500m
  memory: 512Mi
{{- end }}
{{- end }}

{{/*
Create common annotations
*/}}
{{- define "lims.annotations" -}}
app.kubernetes.io/name: {{ include "lims.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "lims.chart" . }}
{{- if .Values.global.annotations }}
{{ toYaml .Values.global.annotations }}
{{- end }}
{{- end }}