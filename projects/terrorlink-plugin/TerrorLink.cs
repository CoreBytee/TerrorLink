using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Modules.Cvars;
using CounterStrikeSharp.API.Modules.Cvars.Validators;

namespace TerrorLink;
public class TerrorLink : BasePlugin
{
    public override string ModuleName => "Hello World Plugin";

    public override string ModuleVersion => "0.0.1";

    public FakeConVar<string> APIToken = new("tl_apitoken", "Token to use when making api requests to the backend server", "unset");

    public override void Load(bool hotReload)
    {
        Console.WriteLine("Hello World!");

        RegisterListener<Listeners.OnTick>(() =>
        {
            var gamerules = Utilities.FindAllEntitiesByDesignerName<CCSGameRulesProxy>("cs_gamerules").First().GameRules!;

            this.SendEvent(new
            {
                type = "tick",
                time = DateTime.Now,
                tick = Server.TickCount,
                data = new
                {
                    map = Server.MapName,
                    round = gamerules.TotalRoundsPlayed,
                    round_phase = gamerules.GamePhase,
                    players = Utilities.GetPlayers().Select(player => new
                    {
                        sid = player.SteamID.ToString(),
                        name = player.PlayerName,
                        health = player.PawnHealth,
                        armor = player.PawnArmor,
                        is_bot = player.IsBot,
                        is_alive = player.PawnIsAlive,
                        is_walking = player.PlayerPawn?.Value?.IsWalking,
                        team = player.Team,
                        velocity = new
                        {
                            x = player.PlayerPawn?.Value?.Velocity.X ?? 0,
                            y = player.PlayerPawn?.Value?.Velocity.Y ?? 0,
                            z = player.PlayerPawn?.Value?.Velocity.Z ?? 0
                        },
                        position = new
                        {
                            x = player.PlayerPawn?.Value?.AbsOrigin!.X ?? 0,
                            y = player.PlayerPawn?.Value?.AbsOrigin!.Y ?? 0,
                            z = player.PlayerPawn?.Value?.AbsOrigin!.Z ?? 0
                        },
                        angle = new
                        {
                            pitch = player.PlayerPawn?.Value?.EyeAngles.X ?? 0,
                            yaw = player.PlayerPawn?.Value?.EyeAngles.Y ?? 0,
                        }
                    }).ToList()
                }
            });
        });
    }

    public async void SendEvent(object eventData)
    {
        using (var client = new HttpClient())
        {
            var json = JsonSerializer.Serialize(eventData);
            var content = new StringContent(json, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
            content.Headers.Add("x-token", APIToken.Value);
            try
            {
                var response = await client.PostAsync("http://localhost:3000/api/gamestate", content);

                if (!response.IsSuccessStatusCode)
                {
                    Logger.LogError("Failed to send event. Status code: {StatusCode}", response.StatusCode);
                }
            }
            catch (HttpRequestException e)
            {
                Logger.LogError("Failed to send event. Exception: {Message}", e.Message);
            }
        }
    }

    [GameEventHandler]
    public HookResult OnPlayerConnect(EventPlayerConnect @event, GameEventInfo info)
    {
        if (@event.Userid != null && @event.Userid.IsValid)
        {
            Logger.LogInformation("Player {Name} has connected!", @event.Userid.PlayerName);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        if (@event.Userid != null && @event.Userid.IsValid)
        {
            Logger.LogInformation("Player {Name} has disconnected!", @event.Userid.PlayerName);
        }

        return HookResult.Continue;
    }
}