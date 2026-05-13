defmodule LmgTrackingWeb.ErrorJSON do
  @moduledoc """
  JSON error response renderer for the tracking service.

  Follows RFC 7807 Problem Details format as specified
  in the Lastmile Gig API standards.
  """

  @doc """
  Renders a JSON error response.

  Returns RFC 7807-compliant Problem Details:
  ```json
  {
    "type": "about:blank",
    "title": "Internal Server Error",
    "status": 500,
    "detail": "An unexpected error occurred"
  }
  ```
  """
  def render(template, _assigns) do
    %{
      type: "about:blank",
      title: title_for(template),
      status: status_for(template),
      detail: detail_for(template)
    }
  end

  defp title_for("404.json"), do: "Not Found"
  defp title_for("401.json"), do: "Unauthorized"
  defp title_for("403.json"), do: "Forbidden"
  defp title_for("422.json"), do: "Unprocessable Entity"
  defp title_for("500.json"), do: "Internal Server Error"
  defp title_for(_), do: "Error"

  defp status_for("404.json"), do: 404
  defp status_for("401.json"), do: 401
  defp status_for("403.json"), do: 403
  defp status_for("422.json"), do: 422
  defp status_for("500.json"), do: 500
  defp status_for(_), do: 500

  defp detail_for("404.json"), do: "The requested resource was not found"
  defp detail_for("401.json"), do: "Authentication is required to access this resource"
  defp detail_for("403.json"), do: "You do not have permission to access this resource"
  defp detail_for("422.json"), do: "The request could not be processed"
  defp detail_for("500.json"), do: "An unexpected error occurred"
  defp detail_for(_), do: "An unexpected error occurred"
end
