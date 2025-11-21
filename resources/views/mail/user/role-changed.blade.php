<x-mail::message>
    Hello {{ $user->name }},

    @if ($user->is_admin)
        You have been assigned the Admin role. You now have administrative privileges.
    @else
        Your role has been changed to Regular User. You no longer have administrative privileges.
    @endif
     <br>

    Thank you,
    {{ config('app.name') }}
</x-mail::message>