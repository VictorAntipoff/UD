import React from 'react';
import { Container, Typography, Grid, Card, CardHeader, CardContent, List, ListItem, ListItemText } from '@mui/material';

export default function AdminSettings() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography 
        variant="h5" 
        component="h1" 
        gutterBottom
        sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500,
          mb: 3
        }}
      >
        Admin Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="User Management"
              subheader="Manage user accounts and permissions"
              sx={{
                '& .MuiCardHeader-title': {
                  fontSize: '0.95rem'
                },
                '& .MuiCardHeader-subheader': {
                  fontSize: '0.8rem'
                }
              }}
            />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Active Users"
                    secondary="Currently active user accounts"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: 500
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.8rem'
                    }}
                  />
                </ListItem>
                {/* ... other list items ... */}
              </List>
            </CardContent>
          </Card>
        </Grid>
        {/* ... other grid items ... */}
      </Grid>
    </Container>
  );
} 