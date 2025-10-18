#!/bin/bash

## Update certificates.
## Suppresses output for clean logs (CLI only)
update-ca-certificates > /dev/null

## Let the actual command take over
exec "$@"