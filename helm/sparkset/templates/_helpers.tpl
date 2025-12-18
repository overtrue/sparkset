{{/*
Expand the name of the chart.
*/}}
{{- define "sparkset.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "sparkset.fullname" -}}
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
{{- define "sparkset.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sparkset.labels" -}}
helm.sh/chart: {{ include "sparkset.chart" . }}
{{ include "sparkset.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sparkset.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sparkset.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API labels
*/}}
{{- define "sparkset.api.labels" -}}
{{ include "sparkset.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API selector labels
*/}}
{{- define "sparkset.api.selectorLabels" -}}
{{ include "sparkset.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Dashboard labels
*/}}
{{- define "sparkset.dashboard.labels" -}}
{{ include "sparkset.labels" . }}
app.kubernetes.io/component: dashboard
{{- end }}

{{/*
Dashboard selector labels
*/}}
{{- define "sparkset.dashboard.selectorLabels" -}}
{{ include "sparkset.selectorLabels" . }}
app.kubernetes.io/component: dashboard
{{- end }}

{{/*
MySQL labels
*/}}
{{- define "sparkset.mysql.labels" -}}
{{ include "sparkset.labels" . }}
app.kubernetes.io/component: mysql
{{- end }}

{{/*
MySQL selector labels
*/}}
{{- define "sparkset.mysql.selectorLabels" -}}
{{ include "sparkset.labels" . }}
app.kubernetes.io/component: mysql
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "sparkset.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sparkset.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}



