import React from 'react';
import { Box, Text } from 'ink';

export type CliStartLogoProps = {
  readonly frame?: string;
  readonly subtitle?: string;
};

export function CliWordmark(): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text color="cyan" bold>
        filelinks
      </Text>
    </Box>
  );
}

export function CliStartLogo({
  frame = ' ',
  subtitle = 'Preparing interactive wizard...',
}: CliStartLogoProps): React.ReactElement {
  // Length: 13 characters - acting as the exact bridge
  const chain = `---( )=( )---`;

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      {/* Visual Logo: Perfectly aligned boxes and chain */}
      <Box marginBottom={1}>
        <Text color="cyan">
          {`   ${frame}   +----------+             +----------+
   ${frame}   |    🤖    |${chain}|    🤖    |
   ${frame}   |          |             |          |
   ${frame}   +----------+             +----------+`}
        </Text>
      </Box>

      {/* "FileLinks" Title - Width: ~37 characters */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          {`   ${frame}    ___ _ _      _    _       _        
   ${frame}   | __(_) | ___| |  (_)_ __| |__ ___
   ${frame}   | _|| | |/ -_) |__| | '  \\ / /(_-<
   ${frame}   |_| |_|_|\\___|____|_|_|_|_\\_\\_/__/`}
        </Text>
      </Box>

      {/* Subtitle */}
      <Box paddingLeft={3}>
        <Text italic color="gray">
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
}
