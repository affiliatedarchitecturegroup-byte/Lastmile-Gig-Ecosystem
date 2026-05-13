defmodule LmgTracking.Metrics.OtelTracer do
  @moduledoc """
  OpenTelemetry tracing helpers for the Lastmile Gig Tracking Service.

  Provides convenience functions for creating trace spans around
  key operations in the tracking service. All spans include:

  - Service name: "lmg-tracking-service"
  - Trace ID correlation with upstream services
  - Relevant attributes (driver_id, order_id, zone, etc.)

  Span naming convention:
  - `tracking.channel.{channel_type}.{operation}` - Channel operations
  - `tracking.location.{operation}` - Location processing
  - `tracking.kafka.{operation}` - Kafka produce/consume
  - `tracking.redis.{operation}` - Redis operations

  Traces are exported via OTLP gRPC to the OTel Collector,
  then forwarded to Tempo + Jaeger for visualization.

  Observability requirement (per DEVELOPMENT_DIRECTIVES.md Section 8):
  Every new service, route handler, Kafka consumer, and background job
  must emit OpenTelemetry trace spans with relevant attributes.
  """

  require OpenTelemetry.Tracer, as: Tracer

  @type span_attrs :: keyword() | map()

  # ---------------------------------------------------------------------------
  # Channel operation spans
  # ---------------------------------------------------------------------------

  @doc """
  Wrap a channel operation in an OpenTelemetry span.

  ## Example

      OtelTracer.with_channel_span("driver", "location_update", %{driver_id: id}) do
        process_location(payload, socket)
      end
  """
  defmacro with_channel_span(channel_type, operation, attributes, do: block) do
    quote do
      span_name = "tracking.channel.#{unquote(channel_type)}.#{unquote(operation)}"
      attrs = build_attributes(unquote(attributes))

      Tracer.with_span span_name, %{attributes: attrs} do
        result = unquote(block)
        result
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Location operation spans
  # ---------------------------------------------------------------------------

  @doc """
  Create a span for a location processing operation.
  """
  @spec trace_location_operation(String.t(), span_attrs(), (-> term())) :: term()
  def trace_location_operation(operation, attributes, fun) do
    span_name = "tracking.location.#{operation}"
    attrs = build_attributes(attributes)

    Tracer.with_span span_name, %{attributes: attrs} do
      result = fun.()

      case result do
        {:error, reason} ->
          Tracer.set_status(:error, inspect(reason))
          result

        _ ->
          result
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Kafka operation spans
  # ---------------------------------------------------------------------------

  @doc """
  Create a span for a Kafka produce operation.
  """
  @spec trace_kafka_produce(String.t(), String.t(), (-> term())) :: term()
  def trace_kafka_produce(topic, key, fun) do
    Tracer.with_span "tracking.kafka.produce",
      %{
        attributes: [
          {"messaging.system", "kafka"},
          {"messaging.destination", topic},
          {"messaging.destination_kind", "topic"},
          {"messaging.kafka.message_key", key}
        ]
      } do
      fun.()
    end
  end

  @doc """
  Create a span for a Kafka consume operation.
  """
  @spec trace_kafka_consume(String.t(), String.t(), (-> term())) :: term()
  def trace_kafka_consume(topic, event_type, fun) do
    Tracer.with_span "tracking.kafka.consume",
      %{
        attributes: [
          {"messaging.system", "kafka"},
          {"messaging.source", topic},
          {"messaging.kafka.consumer_group", "lmg-tracking-consumer"},
          {"lmg.event_type", event_type}
        ]
      } do
      fun.()
    end
  end

  # ---------------------------------------------------------------------------
  # Redis operation spans
  # ---------------------------------------------------------------------------

  @doc """
  Create a span for a Redis operation.
  """
  @spec trace_redis_operation(String.t(), String.t(), (-> term())) :: term()
  def trace_redis_operation(operation, key, fun) do
    Tracer.with_span "tracking.redis.#{operation}",
      %{
        attributes: [
          {"db.system", "redis"},
          {"db.operation", operation},
          {"db.redis.key", key}
        ]
      } do
      fun.()
    end
  end

  # ---------------------------------------------------------------------------
  # Utility functions
  # ---------------------------------------------------------------------------

  @doc """
  Add custom attributes to the current span.
  """
  @spec add_span_attributes(span_attrs()) :: :ok
  def add_span_attributes(attributes) when is_map(attributes) do
    attrs =
      attributes
      |> Enum.map(fn {k, v} -> {"lmg.#{k}", to_string(v)} end)

    Tracer.set_attributes(attrs)
    :ok
  end

  def add_span_attributes(attributes) when is_list(attributes) do
    Tracer.set_attributes(attributes)
    :ok
  end

  @doc """
  Record an error on the current span.
  """
  @spec record_error(term(), String.t()) :: :ok
  def record_error(error, message \\ "") do
    Tracer.set_status(:error, message)

    Tracer.add_event("exception", [
      {"exception.type", inspect(error.__struct__)},
      {"exception.message", Exception.message(error)}
    ])

    :ok
  rescue
    _ ->
      Tracer.set_status(:error, inspect(error))
      :ok
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp build_attributes(attrs) when is_map(attrs) do
    Enum.map(attrs, fn {k, v} -> {"lmg.#{k}", to_string(v)} end)
  end

  defp build_attributes(attrs) when is_list(attrs), do: attrs
  defp build_attributes(_), do: []
end
