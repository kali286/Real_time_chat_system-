<x-mail::message>
    Hello {{ $user->name }},

    @if ($user->blocked_at)
        Your account has been blocked. You are no longer able to log in.
    @else
        Your account has been activated. You can now log in.
    

    @php
        $loginUrl = route('auth.clear_and_login', ['next' => route('login')]);
    @endphp

    <x-mail::button :url="$loginUrl">
        Click here to login
    </x-mail::button>

    <x-mail::subcopy>
        If the button above does not work, copy and paste the following URL into your browser:

        {{ $loginUrl }}
    </x-mail::subcopy>

    @endif

    Thank you,
    {{ config('app.name') }}
    
</x-mail::message>