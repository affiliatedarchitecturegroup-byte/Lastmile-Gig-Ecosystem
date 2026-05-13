defmodule SvcTracking.Telemetry do
  @moduledoc """
  Telemetry supervisor for the Tracking Service.

  Configures metrics collection for Prometheus scraping:
  - WebSocket connection count
  - Channel message throughput
  - Location event processing latency
  - Redis operation duration
  """
  use Supervisor

  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # Phoenix endpoint metrics
      summary("phoenix.endpoint.stop.duration",
        unit: {:native, :millisecond},
        tags: [:method, :request_path]
      ),

      # Channel metrics
      counter("phoenix.channel_joined.count",
        tags: [:channel, :transport]
      ),
      counter("phoenix.channel_handled_in.count",
        tags: [:channel, :event]
      ),
      summary("phoenix.channel_handled_in.duration",
        unit: {:native, :millisecond},
        tags: [:channel, :event]
      ),

      # Broadway metrics
      counter("broadway.processor.message.stop.count",
        tags: [:name]
      ),
      summary("broadway.processor.message.stop.duration",
        unit: {:native, :millisecond},
        tags: [:name]
      ),

      # VM metrics
      summary("vm.memory.total", unit: {:byte, :megabyte}),
      summary("vm.total_run_queue_lengths.total"),
      summary("vm.total_run_queue_lengths.cpu"),
      summary("vm.total_run_queue_lengths.io")
    ]
  end

  defp periodic_measurements do
    [
      {__MODULE__, :connected_sockets_count, []}
    ]
  end

  def connected_sockets_count do
    :telemetry.execute(
      [:svc_tracking, :sockets, :count],
      %{total: 0},
      %{}
    )
  end
end
