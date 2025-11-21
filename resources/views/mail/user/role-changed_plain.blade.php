Hello {{ $user->name }},

@if ($user->is_admin)
You have been assigned the Admin role. You now have administrative privileges.
@else
Your role has been changed to Regular User. You no longer have administrative privileges.
@endif

Thank you,
{{ config('app.name') }}
