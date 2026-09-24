<?php

namespace App\Http\Controllers;

use App\Models\Matter;
use App\Models\MatterEvent;
use Illuminate\Http\Request;

class MatterEventController extends Controller
{
    public function store(Request $request, Matter $matter)
    {
        $data = $request->validate([
            'kind' => ['required', 'in:note,timeline'],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:10000'],
            'occurred_at' => ['required', 'date'],
        ]);

        $matter->events()->create($data + ['user_id' => $request->user()->id]);

        return back()->with('success', 'Entry added.');
    }

    public function destroy(MatterEvent $event)
    {
        $event->delete();

        return back()->with('success', 'Entry removed.');
    }
}
