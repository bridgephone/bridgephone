{
  description = "Bridgephone: dev tooling and Docker helpers";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # `nix develop`: Node, docker-compose and psql. Docker itself must run on the host.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 pkgs.docker-compose pkgs.postgresql ];
        };
      });

      # `nix run .#db` / `nix run .#up` / `nix run .#down`, from the repository root.
      apps = forAllSystems (pkgs:
        let
          compose = name: args: description: {
            type = "app";
            meta.description = description;
            program = "${pkgs.writeShellApplication {
              inherit name;
              runtimeInputs = [ pkgs.docker-compose ];
              text = ''exec docker-compose ${args} "$@"'';
            }}/bin/${name}";
          };
        in
        {
          db = compose "bridgephone-db" "up db" "Start only Postgres (for local development)";
          up = compose "bridgephone-up" "up --build" "Build and start the app and Postgres";
          down = compose "bridgephone-down" "down" "Stop all containers";
        });
    };
}
