{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  packages = [ pkgs.nodejs_24 pkgs.curl pkgs.unzip ];
}
