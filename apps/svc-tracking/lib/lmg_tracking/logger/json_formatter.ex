defmodule LmgTracking.Logger.JsonFormatter do
  @moduledoc """
  Structured JSON log formatter for the Lastmile Gig Tracking Service.

  Produces JSON-formatted log lines compatible with:
  - Loki (log aggregation)
  - OpenSearch (log indexing)
  - AWS CloudWatch (log streaming)

  Each log entry includes:
  - `timestamp` (ISO 8601)
  - `level` (debug, info, warning, error)
  - `message` (log message text)
  - `service` ("lmg-tracking-service")
  - `node` (BEAM node name)
  - `trace_id` (OpenTelemetry trace correlation)
  - `span_id` (OpenTelemetry span correlation)
  - Additional metadata (driver_id, order_id, channel, etc.)

  Security: No PII is logged (per DEVELOPMENT_DIRECTIVES.md Section 5.2).
  """

  @service_name "lmg-tracking-service"

  @doc """
  Format a log event as a JSON string.

  Called by the Elixir Logger backend when configured with:
  ```elixir
  config :logger, :console,
    format: {LmgTracking.Logger.JsonFormatter, :format}
  ```
  """
  @spec format(Logger.level(), Logger.message(), Logger.Formatter.time(), keyword()) ::
          IO.chardata()
  def format(level, message, timestamp, metadata) do
    log_entry = %{
      timestamp: format_timestamp(timestamp),
      level: to_string(level),
      message: to_string(message),
      service: @service_name,
      node: Node.self() |> to_string()
    }

    # Add trace context if available
    log_entry =
      log_entry
      |> maybe_add(:trace_id, metadata[:trace_id])
      |> maybe_add(:span_id, metadata[:span_id])
      |> maybe_add(:request_id, metadata[:request_id])
      |> maybe_add(:driver_id, metadata[:driver_id])
      |> maybe_add(:order_id, metadata[:order_id])
      |> maybe_add(:channel, metadata[:channel])
      |> maybe_add(:module, format_module(metadata[:module]))
      |> maybe_add(:function, metadata[:function])
      |> maybe_add(:line, metadata[:line])

    case Jason.encode(log_entry) do
      {:ok, json} -> [json, "\n"]
      {:error, _} -> ["[#{level}] #{message}\n"]
    end
  rescue
    _ -> ["[#{level}] #{message}\n"]
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp format_timestamp({date, {hours, minutes, seconds, _microseconds}}) do
    {year, month, day} = date

    :io_lib.format("~4..0B-~2..0B-~2..0BT~2..0B:~2..0B:~2..0BZ", [
      year,
      month,
      day,
      hours,
      minutes,
      seconds
    ])
    |> to_string()
  end

  defp maybe_add(map, _key, nil), do: map
  defp maybe_add(map, _key, ""), do: map
  defp maybe_add(map, key, value), do: Map.put(map, key, value)

  defp format_module(nil), do: nil
  defp format_module(module) when is_atom(module), do: inspect(module)
  defp format_module(module), do: to_string(module)
end
